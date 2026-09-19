import IUser from "../interfaces/user.interface.js";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface User extends IUser {}
    export interface Request {
      user?: IUser;
    }
  }
}
