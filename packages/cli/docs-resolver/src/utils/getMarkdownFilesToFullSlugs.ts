import { FernNavigation } from "@fern-api/fdr-sdk";
import { AbsoluteFilePath, RelativeFilePath } from "@fern-api/fs-utils";
import { DocsWorkspace } from "@fern-api/workspace-loader";
import matter from "gray-matter";
import { join } from "path";

export interface GetMarkdownFilesToFullSlugsArgs {
    pages: Record<RelativeFilePath, string>;
    docsWorkspace: DocsWorkspace;
    resolveFilepath: (unresolvedFilepath: string) => AbsoluteFilePath;
    root: FernNavigation.Node;
}

export async function getMarkdownFilesToFullSlugs({
    pages,
    docsWorkspace,
    resolveFilepath,
    root
}: GetMarkdownFilesToFullSlugsArgs): Promise<Map<AbsoluteFilePath, string>> {
    const mdxFilePathToSlug = new Map<AbsoluteFilePath, string>();
    for (const [relativePath, markdown] of Object.entries(pages)) {
        const frontmatter = matter(markdown);
        const slug = frontmatter.data.slug;
        if (typeof slug === "string" && slug.trim().length > 0) {
            mdxFilePathToSlug.set(resolveFilepath(relativePath), slug.trim());
        }
    }

    // all the page slugs in the docs:
    const collector = FernNavigation.NodeCollector.collect(root);
    collector.slugMap.forEach((node, slug) => {
        if (node == null || !FernNavigation.isPage(node)) {
            return;
        }

        const pageId = FernNavigation.getPageId(node);
        if (pageId == null) {
            return;
        }

        const absoluteFilePath = join(docsWorkspace.absoluteFilePath, RelativeFilePath.of(pageId));
        mdxFilePathToSlug.set(absoluteFilePath, slug);
    });

    return mdxFilePathToSlug;
}
