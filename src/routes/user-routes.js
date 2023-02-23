import express from 'express';
import { catchErrors } from '../lib/catch-errors.js';
import { listEvents } from '../lib/db.js';
import passport from '../lib/login.js';
import { createUser, isAdmin } from '../lib/users.js';



export const userRouter = express.Router();

async function index(req, res) {
  const events = await listEvents();
  const { user: { username } = {} } = req || {};

  return res.render('user', {
    username,
    events,
    errors: [],
    data: {},
    title: 'Viðburðir — umsjón',
    admin: false,
  });
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
      failureRedirect: '/user/login',
    }),
  
    // Ef við komumst hingað var notandi skráður inn, senda á /admin
    async (req, res) => {
      const {username } = req.body;
      const admin = await isAdmin(username);
      if(admin){
        res.redirect('/admin');
      }
      else {
        res.redirect('/user');
      }

    }
  );
  
  userRouter.get('/logout', (req, res) => {
    // logout hendir session cookie og session
    req.logout();
    res.redirect('/');
  });

// Verður að vera seinast svo það taki ekki yfir önnur route

 userRouter.get('/register', (req, res)=> {
   res.render('register', {title: 'Nýskráning'});
 });

 async function registerUser(req, res){
  const{name, username, password}= req.body;
  const user = await createUser(name, username, password);

  if(user){
    const message = '';
    return  res.render('login', { message, title: 'Innskráning' })
  
  }
  return res.redirect('error')
 }

  userRouter.post('/register', (req, res) => {

     catchErrors(registerUser(req, res));
  });

  userRouter.get('/user',(req, res)=> {
    index(req,res);
  });
  userRouter.post('/user',(req, res)=> {
    res.render('user', {title: 'Notendasíða', errors: []});
  });

  
  

