import {fileSync} from 'tmp';
import {writeSync} from 'fs';

export function writeCredentialFile(credential: string) {
  const tmpFile = fileSync({postfix: '.json'});
  writeSync(tmpFile.fd, credential);
}
