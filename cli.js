#! /usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import { execSync } from "child_process";
import ora from "ora";
import download from "download-git-repo";
import path from "path";
import fs from "fs";
import { rimraf } from "rimraf";

const repositoryUrl = {
  3: "deepInsigh/pc-preset-vue#main",
};

const __dirname = process.cwd();

const tempDir = path.resolve(__dirname, ".temp");

const questions = [
  {
    type: "input",
    name: "proName",
    message: "Project name",
    default: "my-vue-project",
    validate: function (input) {
      if (/^([A-Za-z\-\_\d])+$/.test(input)) {
        return true;
      } else {
        return "项目名称只能包含字母、数字、横线和下划线";
      }
    },
  },
  {
    type: "input",
    name: "zhName",
    message: "项目中文描述",
    default: "vue3项目",
  },
  {
    type: "list",
    name: "version",
    message: "Vue版本",
    choices: [{ name: "Vue 3.0", value: 3 }],
  },
];

const success = [
  {
    type: "confirm",
    name: "vscode",
    message: "通过VSCode编译器打开",
  },
];

const openCurrentDirectoryWithVSCode = (projectName) =>
  execSync(`code ${__dirname}\\${projectName}`);

async function createProject() {
  try {
    const { proName, zhName, version } = await inquirer.prompt(questions);
    await cloneRepository(repositoryUrl[version], tempDir);
    updatePackageName(proName, tempDir, zhName);
    fs.renameSync(tempDir, proName);
    console.log(chalk.green("🎉项目创建成功！"));
    const { vscode } = await inquirer.prompt(success);
    vscode && openCurrentDirectoryWithVSCode(proName);
  } catch (error) {
    console.error(chalk.red("项目创建失败："), error);
  } finally {
    cleanupTempDir();
  }
}
createProject();

function cleanupTempDir() {
  rimraf.sync(tempDir);
}

function cloneRepository(repositoryUrl, targetDir) {
  const spinner = ora("正在克隆仓库...").start();
  return new Promise((resolve, reject) => {
    download(
      repositoryUrl,
      targetDir,
      {
        rejectUnauthorized: false,
      },
      (err) => {
        if (err) {
          spinner.fail("克隆失败");
          reject(err);
        } else {
          spinner.succeed("克隆成功");
          resolve();
        }
      }
    );
  });
}

function updatePackageName(projectName, targetDir, zhName) {
  const spinner = ora("正在修改项目名称...").start();
  const packageJsonPath = path.resolve(targetDir, "package.json");
  const storeJsonPath = path.resolve(
    targetDir,
    "src",
    "stores",
    "modules",
    "common.ts"
  );
  const htmlPath = path.resolve(targetDir, "index.html");

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  const storeJsonContent = fs.readFileSync(storeJsonPath, "utf8");
  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  try {
    let packageJson = JSON.parse(packageJsonContent);
    packageJson.name = projectName;
    const updatedData = storeJsonContent.replace(
      /key:\s*'pc-template'/,
      `key: '${projectName}'`
    );
    const newHtmlContent = htmlContent.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${zhName}</title>`
    );
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(storeJsonPath, updatedData);
    fs.writeFileSync(htmlPath, newHtmlContent);
    spinner.succeed("项目名称修改成功");
  } catch (error) {
    spinner.fail("项目名称修改失败");
  }
}
