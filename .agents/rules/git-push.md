# Auto Git Push Rule

Always commit and push any new code changes, bug fixes, or enhancements directly to the remote GitHub repository without prompting the user for permission:

- Remote: `origin` (`https://github.com/00tatheer00/ShopFlow---Mobile-Shop-Management-SaaS.git`)
- Primary branches: `main` and `master`
- Command pattern:
  ```bash
  git add .
  git commit -m "descriptive commit message"
  git push origin master
  git push origin master:main
  ```
