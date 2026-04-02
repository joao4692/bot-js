const fs = require('fs/promises');
const path = require('path');

/**
 * Ensures that the directory for a given file path exists.
 * @param {string} filePath The path to the file.
 */
async function ensureDir(filePath) {
    const dirname = path.dirname(filePath);
    try {
        await fs.access(dirname);
    } catch (error) {
        await fs.mkdir(dirname, { recursive: true });
    }
}

/**
 * Reads a JSON file, creating it with a default value if it doesn't exist.
 * @param {string} filePath The path to the JSON file.
 * @param {any} defaultValue The default value to write if the file doesn't exist.
 * @returns {Promise<any>} The parsed JSON data.
 */
async function read(filePath, defaultValue = {}) {
    await ensureDir(filePath);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await write(filePath, defaultValue); // Write the default value if file doesn't exist
            return defaultValue;
        }
        // If the file is corrupted, return the default value and log the error
        console.error(`Error reading or parsing ${filePath}. Returning default value.`, error);
        return defaultValue;
    }
}

/**
 * Writes data to a JSON file atomically to prevent data corruption.
 * @param {string} filePath The path to the JSON file.
 * @param {any} data The data to write.
 */
async function write(filePath, data) {
    await ensureDir(filePath);
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    try {
        await fs.writeFile(tempPath, JSON.stringify(data, null, 4));
        await fs.rename(tempPath, filePath);
    } catch (error) {
        console.error(`Failed to write to ${filePath}`, error);
        // Clean up temp file if it exists
        try {
            await fs.unlink(tempPath);
        } catch (cleanupError) {
            // Ignore cleanup error
        }
    }
}

module.exports = { read, write };
