// publish-cv.mjs 用来改写 public/sitemap.xml 中 CV PDF 条目的正则（/cv/ 是 noindex 跳转页，不列入 sitemap）。单独成模块，便于测试时导入（publish-cv.mjs 导入即执行）。
export const cvFileEntryPattern =
  /<loc>https:\/\/wukai\.work\/KaiWU_CV_\d{8}(?:-\d+)?\.pdf<\/loc>\n    <lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/;
