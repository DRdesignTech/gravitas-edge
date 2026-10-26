import { Request, Response, NextFunction } from 'express';

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export function rawBodyMiddleware(req: RawBodyRequest, _res: Response, next: NextFunction) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = Buffer.from(data, 'utf8');
    next();
  });
}
