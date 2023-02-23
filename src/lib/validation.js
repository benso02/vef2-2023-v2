import { body } from 'express-validator';
import xss from 'xss';

// Endurnýtum mjög líka validation

export function registrationValidationMiddleware(textField) {
  return [
    body(textField)
      .isLength({ max: 400 })
      .withMessage(
        `${
          textField === 'comment' ? 'Athugasemd' : 'Lýsing'
        } má að hámarki vera 400 stafir`
      ),
  ];
}

export function registrationValidation(name, username, password) {
  const errors = {};

  if (!name) {
    errors.name = 'Nafn má ekki vera tómt';
  }
  if (name.length>64){
    errors.name = 'Nafn má ekki vera lengra en 64 stafir';
  }

  if (!username) {
    errors.username = 'Notendanafn má ekki vera tómt';
  }
  if (username.length>64){
    errors.username = 'Notendanafn má ekki vera lengra en 64 stafir';
  }

  if (!password) {
    errors.password = 'Lykilorð má ekki vera tómt';
  }

  if (password>64){
    errors.password = 'Lykilorð má ekki vera lengra en 64 stafir';
  }


  return  errors;
}

// Viljum keyra sér og með validation, ver gegn „self XSS“
export function xssSanitizationMiddleware(textField) {
  return [
    body('name').customSanitizer((v) => xss(v)),
    body(textField).customSanitizer((v) => xss(v)),
  ];
}

export function sanitizationMiddleware(textField) {
  return [body('name').trim().escape(), body(textField).trim().escape()];
}
