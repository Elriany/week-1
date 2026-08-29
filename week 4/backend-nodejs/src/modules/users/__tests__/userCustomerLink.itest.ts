import { describe, it, expect, beforeAll } from 'vitest';
import { AppDataSource } from '../../../config/data-source';
import { User } from '../user.entity';
import { Role } from '../role.entity';
import { Branch } from '../../branches/branch.entity';
import { Department } from '../../departments/department.entity';
import { hashPassword } from '../users.service';
import { ROLE_CODES } from '../permissions.constants';

describe('Users.customerId — link integration tests', () => {
  let branch1: Branch;
  let dept: Department;
  let customerRole: Role;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    branch1 = await AppDataSource.getRepository(Branch).findOneBy({ code: 'HQ' });
    dept = (await AppDataSource.getRepository(Branch).findOne({
      where: { id: branch1.id },
      relations: { departments: true },
    }))!.departments[0];
    customerRole = await AppDataSource.getRepository(Role).findOneBy({ code: ROLE_CODES.CUSTOMER });
  });

  async function makeStaffUser(email: string) {
    const existing = await AppDataSource.getRepository(User).findOneBy({ email });
    if (existing) return existing;
    return AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        email,
        passwordHash: await hashPassword('Test1234'),
        fullNameEn: 'Staff User',
        fullNameAr: 'موظف',
        roleId: customerRole.id,
        branchId: branch1.id,
        departmentId: dept.id,
        isActive: true,
        customerId: null,
      }),
    );
  }

  it('a staff user saves with customerId null', async () => {
    const user = await makeStaffUser('link-staff-1@test.local');
    expect(user.customerId ?? null).toBeNull();
  });

  it('three or more staff users with null customerId coexist (filtered unique index)', async () => {
    const u1 = await makeStaffUser('link-null-1@test.local');
    const u2 = await makeStaffUser('link-null-2@test.local');
    const u3 = await makeStaffUser('link-null-3@test.local');
    expect(u1.customerId ?? null).toBeNull();
    expect(u2.customerId ?? null).toBeNull();
    expect(u3.customerId ?? null).toBeNull();
  });

  it('rejects a second user linked to the same customer', async () => {
    const { Customer } = await import('../../customers/customer.entity');
    const customer = await AppDataSource.getRepository(Customer).findOneBy({ code: 'CUST004' });

    const first = await makeStaffUser('link-cust004-a@test.local');
    first.customerId = customer!.id;
    await AppDataSource.getRepository(User).save(first);

    const second = await makeStaffUser('link-cust004-b@test.local');
    second.customerId = customer!.id;

    await expect(AppDataSource.getRepository(User).save(second)).rejects.toThrow();
  });
});
