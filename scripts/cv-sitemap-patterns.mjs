// publish-cv.mjs 用来改写 public/sitemap.xml 的两个正则。单独成模块，便于测试时导入（publish-cv.mjs 导入即执行）。
export const cvFileEntryPattern =
  /<loc>https:\/\/wukai\.work\/KaiWU_CV_\d{8}(?:-\d+)?\.pdf<\/loc>\n    <lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/;
export const cvAliasEntryPattern =
  /(<loc>https:\/\/wukai\.work\/cv\/<\/loc>\n    <lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/;
