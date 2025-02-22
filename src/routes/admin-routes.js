import express from 'express';
import { validationResult } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEvent,
  dropEvent,
  listEvent,
  listEventByName,
  listEvents,
  updateEvent,
} from '../lib/db.js';
import { ensureLoggedIn } from '../lib/login.js';
import { slugify } from '../lib/slugify.js';
import { isAdmin } from '../lib/users.js';
import {
  registrationValidationMiddleware,
  sanitizationMiddleware,
  xssSanitizationMiddleware,
} from '../lib/validation.js';

export const adminRouter = express.Router();

async function index(req, res) {
  const events = await listEvents();
  const { user: { username } = {} } = req || {};

  if (isAdmin(username)) {
    return res.render('admin', {
      username,
      events,
      errors: [],
      data: {},
      title: 'Viðburðir — umsjón',
      admin: true,
    });
  }

  return res.render('index', {
    title: 'Viðburðasíðan',
    admin: false,
    events,
  });
}

async function validationCheck(req, res, next) {
  const { name, description } = req.body;

  const events = await listEvents();
  const { user: { username } = {} } = req;

  const data = {
    name,
    description,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('admin', {
      events,
      username,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      admin: true,
    });
  }

  return next();
}

async function validationCheckUpdate(req, res, next) {
  const { name, description, location, URL } = req.body;
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent(slug);

  const data = {
    name,
    description,
    location,
    URL,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null && eventNameExists.id !== event.id) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('admin-event', {
      username,
      event,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      admin: true,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { name, URL, location, description } = req.body;
  const slug = slugify(name);
  const creatorId = 1;

  const created = await createEvent({
    name,
    URL,
    location,
    slug,
    description,
    creatorId,
  });

  if (created) {
    return res.redirect('/admin');
  }

  return res.render('error');
}

async function updateRoute(req, res) {
  const { name, description, location, URL } = req.body;
  const { slug } = req.params;

  const event = await listEvent(slug);

  const newSlug = slugify(name);
  const updated = await updateEvent(event.id, {
    name,
    slug: newSlug,
    description,
    location,
    URL,
  });

  if (updated) {
    return res.redirect('/admin');
  }

  return res.render('error');
}
async function dropEventRoute(req, res) {
  const { id } = req.body;
  const created = await dropEvent({ id });
  if (created) {
    return res.redirect('/admin');
  }
  return res.render('error');
}

async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent(slug);

  if (!event) {
    return next();
  }
  const data = {
    name: event.name,
    description: event.description,
    URL: event.url,
    location: event.location,
  };

  return res.render('admin-event', {
    username,
    title: `${event.name} — Viðburðir — umsjón`,
    event,
    errors: [],
    data,
  });
}

adminRouter.post('/dropEvent', catchErrors(dropEventRoute));

adminRouter.get('/', ensureLoggedIn, catchErrors(index));
adminRouter.post(
  '/',
  ensureLoggedIn,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheck),
  sanitizationMiddleware('description'),
  catchErrors(registerRoute)
);

// Verður að vera seinast svo það taki ekki yfir önnur route
adminRouter.get('/:slug', ensureLoggedIn, catchErrors(eventRoute));
adminRouter.post(
  '/:slug',
  ensureLoggedIn,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheckUpdate),
  sanitizationMiddleware('description'),
  catchErrors(updateRoute)
);
