export interface BinaryReaderConfig {
    buffer: Buffer;
}

/** Marker the game writes before every length-prefixed string in the data file. */
const STRING_MARKER = 0x0a60;

/** Sequential little-endian cursor over the decompressed game data file. */
export class BinaryReader {
    private readonly view: DataView;
    private cursor = 0;

    constructor(config: BinaryReaderConfig) {
        this.view = new DataView(config.buffer.buffer, config.buffer.byteOffset, config.buffer.byteLength);
    }

    /** Byte the next read starts at. */
    public get position(): number {
        return this.cursor;
    }

    /** Bytes left to read. */
    public get remaining(): number {
        return this.view.byteLength - this.cursor;
    }

    public uint8(): number {
        const value = this.view.getUint8(this.cursor);
        this.cursor += 1;

        return value;
    }

    public int16(): number {
        const value = this.view.getInt16(this.cursor, true);
        this.cursor += 2;

        return value;
    }

    public uint16(): number {
        const value = this.view.getUint16(this.cursor, true);
        this.cursor += 2;

        return value;
    }

    public int32(): number {
        const value = this.view.getInt32(this.cursor, true);
        this.cursor += 4;

        return value;
    }

    public float(): number {
        const value = this.view.getFloat32(this.cursor, true);
        this.cursor += 4;

        return value;
    }

    /**
     * Moves the cursor without reading, used to step over sections the guide does not need.
     *
     * @param bytes - How many bytes to jump; may be zero.
     * @throws RangeError when the jump would leave the buffer.
     */
    public skip(bytes: number): void {
        if (bytes < 0 || this.cursor + bytes > this.view.byteLength) {
            throw new RangeError(`Cannot skip ${bytes} bytes at ${this.cursor}.`);
        }

        this.cursor += bytes;
    }

    /**
     * Reads a length-prefixed string.
     *
     * @returns The decoded text, without the marker or the length.
     * @throws Error when the marker the game writes before the length is missing, which means the
     *     cursor has drifted out of alignment.
     */
    public string(): string {
        const marker = this.uint16();
        if (marker !== STRING_MARKER) {
            throw new Error(`Expected a string marker at ${this.cursor - 2}, found 0x${marker.toString(16)}.`);
        }

        const length = this.uint16();
        const start = this.cursor;
        this.skip(length);

        return Buffer.from(
            this.view.buffer,
            this.view.byteOffset + start,
            length,
        ).toString('utf8');
    }

    /**
     * Reads a fixed number of records.
     *
     * @param count - How many records follow.
     * @param read - Reads one record, advancing the cursor.
     * @returns The records in file order.
     */
    public list<T>(count: number, read: () => T): T[] {
        const items: T[] = new Array<T>(count);
        for (let index = 0; index < count; index += 1) items[index] = read();

        return items;
    }
}
