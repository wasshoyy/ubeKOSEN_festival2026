//reqのプロパティを追加（sessionId）

import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    sessionId: string | undefined;
  }
}
