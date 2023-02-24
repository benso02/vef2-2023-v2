import { readFile } from 'fs/promises';
import pg from 'pg';

const SCHEMA_FILE = './sql/schema.sql';
const DROP_SCHEMA_FILE = './sql/drop.sql';

const { DATABASE_URL: connectionString, NODE_ENV: nodeEnv = 'development' } =
  process.env;

if (!connectionString) {
  console.error('vantar DATABASE_URL í .env');
  process.exit(-1);
}

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development
// mode, á heroku, ekki á local vél
const ssl = nodeEnv === 'production' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(q, values = []) {
  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    console.error('unable to get client from pool', e);
    return null;
  }

  try {
    const result = await client.query(q, values);
    return result;
  } catch (e) {
    if (nodeEnv !== 'test') {
      console.error('unable to query', e);
    }
    return null;
  } finally {
    client.release();
  }
}

export async function createSchema(schemaFile = SCHEMA_FILE) {
  const data = await readFile(schemaFile);

  return query(data.toString('utf-8'));
}

export async function dropSchema(dropFile = DROP_SCHEMA_FILE) {
  const data = await readFile(dropFile);

  return query(data.toString('utf-8'));
}

export async function createEvent({
  name,
  URL,
  location,
  slug,
  description,
  creatorId,
} = {}) {
  const q = `
    INSERT INTO events
      (name, URL, location, slug, description, creatorId)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, URL, location, slug, description;
  `;
  const values = [name, URL, location, slug, description, creatorId];
  const result = await query(q, values);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}
export async function dropEvent({ id } = {}) {
  const q = `
    DELETE FROM
     events
      WHERE
      id=$1;
  `;
  const values = [id];
  const result = await query(q, values);

  if (result) {
    return true;
  }

  return false;
}

// Updatear ekki description, erum ekki að útfæra partial update
export async function updateEvent(
  id,
  { name, slug, description, location, URL } = {}
) {
  const q = `
    UPDATE events
      SET
        name = $1,
        slug = $2,
        description = $3,
        location = $5,
        URL = $6,
        updated = CURRENT_TIMESTAMP
    WHERE
      id = $4
    RETURNING id, name, slug, description;
  `;
  const values = [name, slug, description, id, location, URL];
  const result = await query(q, values);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

export async function register({ id, comment, event } = {}) {
  const q = `
    INSERT INTO registrations
      (userid, comment, event)
    VALUES
      ($1, $2, $3)
    RETURNING
      id, userid, comment, event;
  `;
  const values = [id, comment, event];
  const result = await query(q, values);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

export async function dropRegistration({ id } = {}) {
  const q = `
   DELETE FROM
    registrations
     WHERE
      userid=$1;
    `;
  const values = [id];
  const result = await query(q, values);

  if (result) {
    return true;
  }

  return false;
}
export async function listEvents() {
  const q = `
    SELECT
      id, name, slug, description, created, updated
    FROM
      events
  `;

  const result = await query(q);

  if (result) {
    return result.rows;
  }

  return null;
}

export async function getEvents(page) {
  const perPage = 10;
  const offset = (page - 1) * perPage;

  const q = `SELECT 
  id, name, url, location, slug, description, created, updated 
  FROM 
  events 
  ORDER BY id LIMIT $1 OFFSET $2
  `;

  const values = [perPage, offset];
  const result = await query(q, values);

  if (result) {
    return result.rows;
  }

  return null;
}

export async function listEvent(slug) {
  const q = `
    SELECT
      id, name, url, location, slug, description, created, updated
    FROM
      events
    WHERE slug = $1
  `;

  const result = await query(q, [slug]);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}
export async function getEventCount() {
  const q = `
    SELECT
     max(id)
    FROM
      events
  `;
  const result = await query(q);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

// TODO gætum fellt þetta fall saman við það að ofan
export async function listEventByName(name) {
  const q = `
    SELECT
      id, name, location, URL, slug, description, created, updated
    FROM
      events
    WHERE name = $1
  `;

  const result = await query(q, [name]);

  if (result && result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

export async function listRegistered(event) {
  const q = `
    SELECT
      R.id, U.name, R.comment
    FROM
      registrations AS R
      left join users AS U ON
      U.id= R.userid 
    WHERE R.event = $1
  `;

  const result = await query(q, [event]);

  if (result) {
    return result.rows;
  }

  return null;
}

export async function end() {
  await pool.end();
}

export async function checkUserRegistration(userid, eventid) {
  const q = `
  SELECT
    *
  FROM
    registrations
  WHERE userId = $1 AND event = $2
`;

  const result = await query(q, [userid, eventid]);

  if (result && result.rows.length > 0) {
    return true;
  }

  return false;
}
