declare module 'tone' {
  export const context: any;
  export const Transport: any;
  export class Player {
    constructor(url: string | ToneAudioBuffer);
    start(time?: number, offset?: number): void;
    stop(time?: number): void;
    sync(): this;
    unsync(): void;
    dispose(): void;
    toDestination(): this;
  }
  export class Players {
    constructor(urls: Record<string, string>);
    player(name: string): Player;
    toDestination(): this;
  }
  export class Volume {
    constructor(volume: number);
    toDestination(): this;
    dispose(): void;
  }
  export class ToneAudioBuffer {
    static fromArray(array: Float32Array): ToneAudioBuffer;
  }
  export function now(): number;
  export function start(): Promise<void>;
  export function getTransport(): any;
}
