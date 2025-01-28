import { readFile } from "fs/promises";
import grayMatter from "gray-matter";
import { visit } from "unist-util-visit";

import { getMarkdownFormat, getReplacedHref, parseMarkdownToTree, trimAnchor } from "@fern-api/docs-markdown-utils";
import { AbsoluteFilePath, doesPathExistSync } from "@fern-api/fs-utils";

import { DocsDefinitionResolver } from "@fern-api/docs-resolver";
import { Rule, RuleViolation } from "../../Rule";

export const ValidMarkdownFileReferences: Rule = {
    name: "valid-markdown-file-references",
    create: (context) => {

        const resolver = new DocsDefinitionResolver(
            context.workspace.config.instances[0]?.url ?? "https://localhost:8080",
            context.workspace,
            context.ossWorkspaces,
            context.fernWorkspaces,
            context,
            undefined,
            async (files) => {},
            async (opts) => {},
            async (opts) => {}
        );

        return {
            filepath: async ({ absoluteFilepath }) => {
                if (!absoluteFilepath.endsWith(".md") && !absoluteFilepath.endsWith(".mdx")) {
                    return [];
                }

                try {
                    const fileContents = await readFile(absoluteFilepath, "utf-8");
                    const { content } = grayMatter(fileContents, {});

                    const tree = parseMarkdownToTree(content, getMarkdownFormat(absoluteFilepath));

                    const errors: RuleViolation[] = [];

                    visit(tree, (node) => {
                        if (node.type === "link") {
                            const href = getReplacedHref({
                                href: trimAnchor(node.url),
                                metadata: {
                                    absolutePathToFernFolder: absoluteFilepath,
                                    absolutePathToMarkdownFile: absoluteFilepath
                                },
                                markdownFilesToPathName: {}
                            });

                            if (href?.type === "missing-reference") {
                                try {
                                    const pathExists = doesPathExistSync(AbsoluteFilePath.of(href.path));
                                    errors.push({
                                        severity: "error",
                                        message: pathExists
                                            ? `File ${href.href} exists but is not specified in docs.yml`
                                            : `File ${href.href} does not exist`
                                    });
                                } catch (err) {}
                            }
                        }
                    });

                    return errors;
                } catch (error) {
                    return [];
                }
            }
        };
    }
};
