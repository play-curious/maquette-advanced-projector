/* tslint:disable:no-namespace */

declare namespace NodeJS {
  interface Global {
    requestAnimationFrame: any;
    cancelAnimationFrame: any;
    window?: Window;
  }
}
