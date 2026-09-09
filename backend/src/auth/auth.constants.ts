import { CookieOptions } from 'express';

// Одне джерело часу життя refresh-токена. З нього виводяться і expiresAt у рядку
// сесії, і expiresIn самого токена, і maxAge куки — щоб вони не розійшлися
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = 'refreshToken';

// Однакові опції обов'язкові в усіх трьох місцях — login, refresh, logout.
// Браузер розрізняє куки за трійкою (ім'я, домен, шлях): варто десь поставити
// інший path, і замість перезапису з'явиться друга кука з тим самим іменем,
// а logout не зможе видалити ту, яку треба
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  // JS на сторінці не має доступу до цієї куки — украсти її через XSS не вийде
  httpOnly: true,

  // тільки поверх HTTPS. Локально фронт на http, тож у розробці має бути false,
  // інакше браузер просто викине куку й ти шукатимеш, чому вона не ставиться
  secure: process.env.NODE_ENV === 'production',

  // SameSite порівнює site, а не origin. origin = схема+хост+порт,
  // site = схема+реєстровний домен, порт не рахується.
  // localhost:3000 і localhost:5000 — різні origin, але ОДИН site, тому 'lax'
  // куку пропускає. Піддомени одного домену (app.example.com / api.example.com)
  // теж один site — там 'lax' так само вистачить.
  // 'none' потрібен лише на РІЗНИХ реєстровних доменах (vercel.app /
  // onrender.com) і тягне за собою secure: true плюс втрату автоматичної
  // заслінки від CSRF
  sameSite: 'lax',

  // кука летить лише на /auth/*, а не на кожен запит до /drafts і /heroes
  path: '/auth',

  // в Express це МІЛІСЕКУНДИ, хоч у самому заголовку Max-Age і секунди —
  // перетворення робить res.cookie()
  maxAge: REFRESH_TTL_MS,
};
