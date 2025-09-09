// ESLint rule for migration file format validation

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce migration file format and structure",
      category: "Best Practices",
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      invalidFileName:
        "Migration file name must follow format: YYYY-MM-DD-description.ts",
      missingUpExport: "Migration file must export 'up' function",
      missingDownExport: "Migration file must export 'down' function",
      invalidUpType: "Migration 'up' function must be of type Migration['up']",
      invalidDownType:
        "Migration 'down' function must be of type Migration['down']",
      missingKyselyImport: "Migration file must import Kysely types",
      missingSqlImport: "Migration file must import sql from kysely",
      invalidFunctionSignature:
        "Migration functions must be async and accept db parameter",
      missingConsoleLog:
        "Migration functions should include console.log for feedback",
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isMigrationFile =
      filename.includes("/migrations/") && filename.endsWith(".ts");

    if (!isMigrationFile) {
      return {};
    }

    return {
      Program(node) {
        // Check file name format
        const fileName = filename.split("/").pop();
        const datePattern = /^\d{4}-\d{2}-\d{2}-[a-zA-Z0-9-_]+\.ts$/;
        if (!datePattern.test(fileName)) {
          context.report({
            node,
            messageId: "invalidFileName",
          });
        }
      },

      ImportDeclaration(node) {
        if (node.source.value === "kysely") {
          const hasKyselyTypes = node.specifiers.some(
            (spec) =>
              spec.type === "ImportSpecifier" &&
              (spec.imported.name === "Migration" ||
                spec.imported.name === "Kysely"),
          );
          const hasSqlImport = node.specifiers.some(
            (spec) =>
              spec.type === "ImportDefaultSpecifier" &&
              spec.local.name === "sql",
          );

          if (!hasKyselyTypes) {
            context.report({
              node,
              messageId: "missingKyselyImport",
            });
          }

          if (!hasSqlImport) {
            context.report({
              node,
              messageId: "missingSqlImport",
            });
          }
        }
      },

      ExportNamedDeclaration(node) {
        if (
          node.declaration &&
          node.declaration.type === "VariableDeclaration"
        ) {
          const declaration = node.declaration;
          const declarations = declaration.declarations;

          declarations.forEach((decl) => {
            if (decl.id.name === "up" || decl.id.name === "down") {
              // Check if it's properly typed
              if (!decl.id.typeAnnotation) {
                context.report({
                  node: decl.id,
                  messageId:
                    decl.id.name === "up" ? "invalidUpType" : "invalidDownType",
                });
              }

              // Check function signature
              if (decl.init && decl.init.type === "ArrowFunctionExpression") {
                const func = decl.init;
                if (!func.async) {
                  context.report({
                    node: func,
                    messageId: "invalidFunctionSignature",
                  });
                }

                if (func.params.length !== 1 || func.params[0].name !== "db") {
                  context.report({
                    node: func,
                    messageId: "invalidFunctionSignature",
                  });
                }
              }
            }
          });
        }
      },

      // Check for console.log in migration functions
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "console" &&
          node.callee.property.name === "log"
        ) {
          // This is a console.log - check if we're in a migration function
          let parent = node.parent;
          while (parent) {
            if (
              parent.type === "ArrowFunctionExpression" ||
              parent.type === "FunctionDeclaration"
            ) {
              // Found a function - check if it's up or down
              if (
                parent.id &&
                (parent.id.name === "up" || parent.id.name === "down")
              ) {
                // This console.log is in a migration function - good!
                return;
              }
            }
            parent = parent.parent;
          }
        }
      },

      // Check for missing exports
      Program(node) {
        const exports = node.body.filter(
          (node) => node.type === "ExportNamedDeclaration",
        );

        const hasUpExport = exports.some((exportNode) => {
          if (
            exportNode.declaration &&
            exportNode.declaration.type === "VariableDeclaration"
          ) {
            return exportNode.declaration.declarations.some(
              (decl) => decl.id.name === "up",
            );
          }
          return false;
        });

        const hasDownExport = exports.some((exportNode) => {
          if (
            exportNode.declaration &&
            exportNode.declaration.type === "VariableDeclaration"
          ) {
            return exportNode.declaration.declarations.some(
              (decl) => decl.id.name === "down",
            );
          }
          return false;
        });

        if (!hasUpExport) {
          context.report({
            node,
            messageId: "missingUpExport",
          });
        }

        if (!hasDownExport) {
          context.report({
            node,
            messageId: "missingDownExport",
          });
        }
      },
    };
  },
};
