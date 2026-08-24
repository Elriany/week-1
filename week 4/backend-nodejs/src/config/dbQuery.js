/**
 * Unified SQL Server Query Helper
 *
 * Executes SQL queries against ApprovalWorkflowSystem using sqlcmd CLI wrapper with Windows Authentication.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const env = require('./environment');
const logger = require('../utils/logger.util');

const DB_SERVER = env.DB_SERVER && env.DB_SERVER !== 'localhost' ? env.DB_SERVER : '.';
const DB_NAME = env.DB_DATABASE || 'ApprovalWorkflowSystem';

/**
 * Clean raw sqlcmd buffer output into safe JSON
 */
function cleanOutput(buf) {
  let text = buf.toString('utf-8');
  // Replace non-ASCII CP1252 artifact characters that break JSON string borders
  text = text.replace(/[\u0080-\u00FF]/g, ' ');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.includes('rows affected'))
    .join('');
}

/**
 * Execute raw SQL query and return recordset array
 */
function query(sqlStr, params = {}) {
  let processedSql = sqlStr;

  // Process parameter replacements
  Object.keys(params).forEach((key) => {
    const val = params[key];
    let sqlVal = 'NULL';

    if (val !== null && val !== undefined) {
      const isNumericParam =
        (key === 'offset' || key === 'pageSize' || key === 'page' || key.toLowerCase().endsWith('id')) &&
        /^\d+$/.test(String(val).trim());
      if (typeof val === 'number' || isNumericParam) {
        sqlVal = String(val).trim();
      } else if (typeof val === 'boolean') {
        sqlVal = val ? '1' : '0';
      } else if (val instanceof Date) {
        sqlVal = `'${val.toISOString()}'`;
      } else {
        const strVal = String(val).replace(/'/g, "''");
        sqlVal = `'${strVal}'`;
      }
    }

    const regex = new RegExp(`@${key}\\b`, 'g');
    processedSql = processedSql.replace(regex, sqlVal);
  });

  const isSelect = /\bSELECT\b/i.test(processedSql);

  if (isSelect) {
    const trimmed = processedSql.trim().replace(/;?\s*$/, '');
    const wrappedSql = `
SET NOCOUNT ON;
${trimmed} FOR JSON PATH;
`;

    const tempFile = path.join(__dirname, `_temp_query_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.sql`);
    fs.writeFileSync(tempFile, wrappedSql, 'utf-8');

    try {
      const cmd = `sqlcmd -S "${DB_SERVER}" -d "${DB_NAME}" -i "${tempFile}" -y 0`;
      const rawBuffer = execSync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      const jsonText = cleanOutput(rawBuffer);

      if (!jsonText || jsonText === '[]') return [];

      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      logger.error('Database query execution error', { error: err.message, sql: processedSql });
      throw err;
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  // INSERT / UPDATE / DELETE without SELECT
  const tempFile = path.join(__dirname, `_temp_exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.sql`);
  const wrappedExec = `
SET NOCOUNT ON;
${processedSql}
`;
  fs.writeFileSync(tempFile, wrappedExec, 'utf-8');

  try {
    const cmd = `sqlcmd -S "${DB_SERVER}" -d "${DB_NAME}" -i "${tempFile}" -y 0`;
    const rawBuffer = execSync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const jsonText = cleanOutput(rawBuffer);

    if (jsonText.startsWith('[') || jsonText.startsWith('{')) {
      try {
        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    return [];
  } catch (err) {
    logger.error('Database execution error', { error: err.message, sql: processedSql });
    throw err;
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

/**
 * Transaction Helper
 */
class TransactionHelper {
  constructor() {
    this.queries = [];
  }

  add(sqlStr, params = {}) {
    let processedSql = sqlStr;
    Object.keys(params).forEach((key) => {
      const val = params[key];
      let sqlVal = 'NULL';
      if (val !== null && val !== undefined) {
        const isNumericParam =
          (key === 'offset' || key === 'pageSize' || key === 'page' || key.toLowerCase().endsWith('id')) &&
          /^\d+$/.test(String(val).trim());
        if (typeof val === 'number' || isNumericParam) {
          sqlVal = String(val).trim();
        } else if (typeof val === 'boolean') {
          sqlVal = val ? '1' : '0';
        } else if (val instanceof Date) {
          sqlVal = `'${val.toISOString()}'`;
        } else {
          sqlVal = `'${String(val).replace(/'/g, "''")}'`;
        }
      }
      processedSql = processedSql.replace(new RegExp(`@${key}\\b`, 'g'), sqlVal);
    });
    this.queries.push(processedSql);
  }

  commit() {
    const batch = `BEGIN TRANSACTION;\nBEGIN TRY\n${this.queries.join(';\n')};\nCOMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\nROLLBACK TRANSACTION;\nTHROW;\nEND CATCH;`;
    const tempFile = path.join(__dirname, `_temp_tx_${Date.now()}.sql`);
    fs.writeFileSync(tempFile, batch, 'utf-8');
    try {
      const cmd = `sqlcmd -S "${DB_SERVER}" -d "${DB_NAME}" -i "${tempFile}" -b`;
      execSync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}

module.exports = { query, TransactionHelper };
