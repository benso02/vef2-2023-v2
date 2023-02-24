import express from 'express';
import { validationResult } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import {
  checkUserRegistration,
  getEventCount,
  getEvents,
  listEvent,
  listEvents,
  listRegistered,
  register,
} from '../lib/db.js';
import {
  registrationValidationMiddleware,
  sanitizationMiddleware,
  xssSanitizationMiddleware,
} from '../lib/validation.js';

export const indexRouter = express.Router();

async function indexRoute(req, res) {
  const events = await listEvents();

  res.render('index', {
    title: 'Viðburðasíðan',
    admin: false,
    events,
  });
}

async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const event = await listEvent(slug);
  const { user: { id } = {} } = req || {};

  if (!event) {
    return next();
  }

  const registered = await listRegistered(event.id);

  const userRegistration = await checkUserRegistration(id, event.id);

  return res.render('event', {
    title: `${event.name} — Viðburðasíðan`,
    event,
    userRegistration,
    registered,
    errors: [],
    data: {},
  });
}

async function eventRegisteredRoute(req, res) {
  const events = await listEvents();

  res.render('registered', {
    title: 'Viðburðasíðan',
    events,
  });
}

async function validationCheck(req, res, next) {
  const { user: { id } = {} } = req || {};
  const { comment } = req.body;

  // TODO tvítekning frá því að ofan
  const { slug } = req.params;
  const event = await listEvent(slug);
  const registered = await listRegistered(event.id);

  const data = {
    id,
    comment,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('event', {
      title: `${event.name} — Viðburðasíðan`,
      data,
      event,
      registered,
      errors: validation.errors,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { comment } = req.body;
  const { slug } = req.params;
  const event = await listEvent(slug);
  const { user: { id } = {} } = req || {};

  const registered = await register({
    id,
    comment,
    event: event.id,
  });

  if (registered) {
    return res.redirect(`/${event.slug}`);
  }

  return res.render('error');
}
export async function pagingIndex(req, res) {
  const currentPage = req.query.page || 1;
  const eventCount = await getEventCount();
  let maxEvents;
  if (eventCount !== null) {
    maxEvents = eventCount.max;
  } else {
    maxEvents = 1;
  }
  const pageCount = Math.ceil(maxEvents / 10);
  const events = await getEvents(currentPage);
  const title = 'Viðburðasíðan';
  const admin = false;

  return res.render('index', { title, events, pageCount, currentPage, admin });
}

indexRouter.get('/', catchErrors(pagingIndex));

indexRouter.get('/', catchErrors(indexRoute));
indexRouter.get('/:slug', catchErrors(eventRoute));
indexRouter.post(
  '/:slug',
  registrationValidationMiddleware('comment'),
  xssSanitizationMiddleware('comment'),
  catchErrors(validationCheck),
  sanitizationMiddleware('comment'),
  catchErrors(registerRoute)
);
indexRouter.get('/:slug/thanks', catchErrors(eventRegisteredRoute));
