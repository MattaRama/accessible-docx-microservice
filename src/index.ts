import express from 'express';
import { config } from 'dotenv';
import fileUpload from 'express-fileupload';

import routes from './routes';

config();
const app = express();

app.use(fileUpload());
app.use(express.json());
app.use('/', routes);

const SERVER_PORT = parseInt(process.env['SERVER_PORT']!);

app.listen(SERVER_PORT, () => {
  console.log('Application started on port ' + SERVER_PORT);
});