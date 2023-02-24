import express from 'express';
import { catchErrors } from '../lib/catch-errors.js';
import {
  dropRegistration,
  getEventCount,
  getEvents,
  listEvents,
} from '../lib/db.js';
import passport from '../lib/login.js';
import { createUser, isAdmin } from '../lib/users.js';
import { registrationValidation } from '../lib/validation.js';

export const userRouter = express.Router();

export async function pagingUser(req, res, username) {
  const currentPage = req.query.page || 1;
  const eventCount = await getEventCount();
  const maxEvents = eventCount.max;
  const pageCount = Math.ceil(maxEvents / 10);
  const events = await getEvents(currentPage);
  const admin = false;
  const title = 'Notendasíðan';

  return res.render('user', {
    username,
    events,
    pageCount,
    currentPage,
    admin,
    errors: [],
    data: {},
    title,
  });
}

async function index(req, res) {
  const events = await listEvents();
  const { user: { username } = {} } = req || {};
  const admin = await isAdmin(username);
  if (admin) {
    return res.render('admin', {
      username,
      events,
      errors: [],
      data: {},
      title: 'Viðburðir — umsjón',
      admin: true,
    });
  }

  return pagingUser(req, res, username);
}

function login(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/user');
  }

  let message = '';

  // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
  // og hreinsum skilaboð
  if (req.session.messages && req.session.messages.length > 0) {
    message = req.session.messages.join(', ');
    req.session.messages = [];
  }

  return res.render('login', { message, title: 'Innskráning' });
}

userRouter.get('/login', login);
userRouter.post(
  '/login',

  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/login',
  }),

  // Ef við komumst hingað var notandi skráður inn, senda á /admin
  async (req, res) => {
    const { username } = req.body;
    const admin = await isAdmin(username);
    if (admin) {
      res.redirect('/admin');
    } else {
      res.redirect('/user');
    }
  }
);

// Verður að vera seinast svo það taki ekki yfir önnur route

userRouter.get('/register', (req, res) => {
  const errors = [];
  res.render('register', { title: 'Nýskráning', errors });
});

async function registerUser(req, res) {
  const { name, username, password } = req.body;
  const user = await createUser(name, username, password);
  const errors = registrationValidation(name, username, password);
  if (Object.keys(errors).length > 0) {
    return res.render('register', { title: 'Nýskráning', errors });
  }
  if (user) {
    const message = '';
    return res.render('login', { message, title: 'Innskráning' });
  }
  return res.redirect('error');
}

userRouter.post('/register', (req, res) => {
  catchErrors(registerUser(req, res));
});

userRouter.get('/user', (req, res) => {
  index(req, res);
});
userRouter.post('/user', (req, res) => {
  res.render('user', { title: 'Notendasíða', errors: [] });
});

/* userRouter.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });
   */
async function dropRegistrationRoute(req, res) {
  const { user: { id } = {} } = req || {};
  const created = await dropRegistration({ id });
  if (created) {
    return res.redirect('/user');
  }
  return res.render('error');
}

userRouter.post('/dropRegistration', catchErrors(dropRegistrationRoute));
