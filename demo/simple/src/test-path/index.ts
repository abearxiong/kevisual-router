import { pathToRegexp } from 'path-to-regexp';
// import { match } from 'path-to-regexp';

const pattern = pathToRegexp('/users/*splat');
const match = pattern.regexp.exec('/users/123/j/d/f');
console.log(match);
// const pattern = pathToRegexp('/users/:id');
// const match = pattern.regexp.exec('/users/123');
// console.log(match);
// const pattern = '/a/b/*splat';
// const matchPath = match(pattern);
// console.log(matchPath('/a/b/c'));

