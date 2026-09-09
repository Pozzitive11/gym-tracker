export interface JwtPayload {
  // id тепер uuid, а не автоінкремент — тому string
  sub: string;
  iat: number;
  exp: number;
}
