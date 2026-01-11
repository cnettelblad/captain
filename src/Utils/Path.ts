import { dirname } from 'path';
import { fileURLToPath } from 'url';

export function getModuleDir(metaUrl: string): string {
    const __filename = fileURLToPath(metaUrl);
    return dirname(__filename);
}
