/**
 * Generate api.md from OpenAPI spec (same source as Swagger UI).
 * Run: npm run docs:api-md
 */
const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');
const { convertMarkdown } = require('openapi-to-md');

const projectRoot = path.join(__dirname, '..');
const swaggerConfig = require(path.join(projectRoot, 'src', 'config', 'swagger.js'));

const spec = swaggerJsdoc(swaggerConfig);
const docsDir = path.join(projectRoot, 'docs');
const specPath = path.join(docsDir, 'openapi.json');
const mdPath = path.join(projectRoot, 'api.md');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');

(async () => {
  try {
    const specStr = JSON.stringify(spec);
    const markdown = await convertMarkdown(specStr, true);
    if (markdown) {
      fs.writeFileSync(mdPath, markdown, 'utf8');
      console.log('api.md generated.');
    } else {
      throw new Error('convertMarkdown returned empty');
    }
  } catch (err) {
    console.error('openapi-to-md failed:', err.message);
    const md = fallbackMarkdown(spec);
    fs.writeFileSync(mdPath, md, 'utf8');
    console.log('api.md generated (fallback).');
  }
})();

function fallbackMarkdown(spec) {
  const lines = ['# ' + (spec.info?.title || 'API'), '', spec.info?.description || '', ''];
  if (spec.paths) {
    for (const [pathName, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (typeof op !== 'object' || !op.summary) continue;
        lines.push(`## ${method.toUpperCase()} ${pathName}`);
        lines.push('');
        lines.push(op.summary);
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}
