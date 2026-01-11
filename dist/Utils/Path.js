import { dirname } from 'path';
import { fileURLToPath } from 'url';
export function getModuleDir(metaUrl) {
    const __filename = fileURLToPath(metaUrl);
    return dirname(__filename);
}
