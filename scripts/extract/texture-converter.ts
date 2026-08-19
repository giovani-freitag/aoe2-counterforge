import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readTarga, type Image } from './image.ts';

export interface TextureConverterConfig {
    /** Absolute path of the texture converter the game ships in its tools folder. */
    executable: string;
    /** Folder the converter unpacks into; its contents are read back and can be discarded. */
    workingDirectory: string;
}

/**
 * Files per invocation.
 *
 * Every path travels on the command line, and Windows refuses one longer than about 32000
 * characters.
 */
const BATCH_SIZE = 100;

/** Reads the game's textures, whatever they are compressed with, as plain images. */
export class TextureConverter {
    private readonly config: TextureConverterConfig;

    constructor(config: TextureConverterConfig) {
        this.config = config;
    }

    /**
     * Decodes every texture of a batch at its original size.
     *
     * @param sources - Absolute paths of the textures to decode.
     * @returns The image behind each source, keyed by the source path.
     * @throws Error when the converter reports a failure.
     */
    public decode(sources: readonly string[]): Map<string, Image> {
        const images = new Map<string, Image>();

        for (let start = 0; start < sources.length; start += BATCH_SIZE) {
            const batch = sources.slice(start, start + BATCH_SIZE);
            this.run(batch);

            for (const source of batch) {
                const unpacked = join(this.config.workingDirectory, `${basename(source).replace(/\.[^.]+$/, '')}.tga`);
                images.set(source, readTarga(readFileSync(unpacked)));
            }
        }

        return images;
    }

    private run(sources: readonly string[]): void {
        const result = spawnSync(
            this.config.executable,
            ['-nologo', '-y', '-ft', 'tga', '-o', this.config.workingDirectory, ...sources],
            { windowsHide: true, encoding: 'utf8' },
        );

        if (result.error) throw result.error;
        if (result.status !== 0) {
            throw new Error(`The texture converter exited with ${String(result.status)}: ${result.stderr}`);
        }
    }
}
