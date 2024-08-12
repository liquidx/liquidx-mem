export interface UserView {
  tags: string;
}

export type UserWriteSecret = string;

export interface User {
  _id: string;
  username: string;
  writeSecret: UserWriteSecret;
  views: UserView[];
}
