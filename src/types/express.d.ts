import IUser from "../interfaces/user.interface.js";

declare global {
  namespace Express {
    export interface Request {
      user?: IUser;
    }
  }
}
