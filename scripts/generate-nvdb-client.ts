import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const SPEC_PATH = join(process.cwd(), 'nvdb-api.json')
const OUTPUT_DIR = join(process.cwd(), 'app', 'lib', 'nvdb')

// Clean and recreate output directory
rmSync(OUTPUT_DIR, { recursive: true, force: true })
mkdirSync(OUTPUT_DIR, { recursive: true })

// Generate the client
execSync(
  `npx openapi-generator-cli generate \
    -i ${SPEC_PATH} \
    -g typescript-axios \
    -o ${OUTPUT_DIR} \
    --skip-validate-spec \
    --additional-properties=npmName=nvdb-client,npmVersion=1.0.0,typescriptThreePlus=true`,
  { stdio: 'inherit' },
)

// Clean up unnecessary files
const filesToKeep = ['api.ts', 'base.ts', 'common.ts', 'configuration.ts']
const files = execSync('ls', { cwd: OUTPUT_DIR }).toString().split('\n')
files.forEach((file) => {
  if (!filesToKeep.includes(file) && file) {
    rmSync(join(OUTPUT_DIR, file), { recursive: true, force: true })
  }
})
