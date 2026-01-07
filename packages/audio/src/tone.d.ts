declare module 'tone' {
  export const context: any;
  export const Transport: any;
  export class Player {
    constructor(url: string);
    start(time?: number): void;
    stop(time?: number): void;
    toDestination(): this;
  }
  export class Players {
    constructor(urls: Record<string, string>);
    player(name: string): Player;
    toDestination(): this;
  }
  export function now(): number;
  export function start(): Promise<void>;
}
