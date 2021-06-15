import { promises as fsp } from 'fs';
import fm from 'front-matter';
import fetch from 'node-fetch';
import { ASSETS_ROOT_PATH, SRC_FOLDER_PATH } from './constants.js';

const URL = `https://puruvj.dev/api/get-emos?blogID=`;
const MAX_COUNT = 6;

export async function getPopularBlogPosts() {
  // Read all the blog posts
  const blogPostFiles = (await fsp.readdir(`${SRC_FOLDER_PATH}/blog/`)).filter((str) =>
    str.endsWith('.md'),
  );

  // Read file
  const datesList = [];

  for (let file of blogPostFiles) {
    const content = await fsp.readFile(`${SRC_FOLDER_PATH}/blog/${file}`, 'utf8');

    // @ts-ignore
    const metadata = fm(content).attributes;

    datesList.push(new Date(metadata.date));
  }

  const blogPostsIDs = blogPostFiles.map((str) => str.replace('.md', ''));

  // List
  /**
   */
  const likesList = [];

  for (let [index, id] of Object.entries(blogPostsIDs)) {
    const req = await fetch(`${URL}${id}`);

    const { likes } = await req.json();

    likesList.push({ id, likes, date: datesList[+index] });
  }

  const rankList = likesList.sort(
    (a, b) => calculateScore(b.likes, b.date + '') - calculateScore(a.likes, a.date + ''),
  );

  // Now let's get the data from the already generated metadata in blogs-list.js
  /** @type {any[]} */
  const finalMetaData = JSON.parse(
    await fsp.readFile(`${ASSETS_ROOT_PATH}/data/blogs-list.json`, 'utf8'),
  );

  // Get data and write to file
  const rankedData = rankList.map(({ id }) => finalMetaData.find((fmData) => fmData.id === id));

  rankedData.length = MAX_COUNT;

  // Write to the file
  fsp.writeFile(`${ASSETS_ROOT_PATH}/data/homepage-blogs-list.json`, JSON.stringify(rankedData));
}

/**
 * Source: https://jkchu.com/2016/02/17/designing-and-implementing-a-ranking-algorithm/
 * @param {number} likes
 * @param {string} dateCreatedStr
 */
function calculateScore(likes, dateCreatedStr) {
  const timeCreatedDiff = (+new Date() - +new Date(dateCreatedStr)) / 1e6;

  const numerator = likes;

  const denominator = 1 + timeCreatedDiff ** 1.8;

  return (numerator / denominator) * 1e4;
}
