import { Request } from "express"

interface MyUserRequest extends Request {
  userId?: string;
}