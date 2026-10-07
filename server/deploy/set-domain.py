# -*- coding: utf-8 -*-
"""Подставляет настоящий домен вместо заглушки julamore.ru во всех файлах сайта.

Запуск (из папки сайта):
    python server/deploy/set-domain.py example.ru

Что меняется: canonical и og:url на страницах, адрес в разметке для поисковиков,
адрес сайта в политике, sitemap.xml и robots.txt.
"""
import io, os, re, sys, glob

PLACEHOLDER = "julamore.ru"


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    domain = sys.argv[1].strip().lower()
    domain = re.sub(r"^https?://", "", domain).strip("/")
    if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", domain):
        print("Непохоже на домен:", domain)
        sys.exit(1)

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.chdir(root)

    targets = sorted(glob.glob("*.html")) + ["sitemap.xml", "robots.txt"]
    changed = 0
    for name in targets:
        if not os.path.exists(name):
            continue
        text = io.open(name, encoding="utf-8").read()
        if PLACEHOLDER not in text and "https://_______.ru" not in text:
            continue
        new = text.replace(PLACEHOLDER, domain).replace("https://_______.ru", "https://" + domain)
        io.open(name, "w", encoding="utf-8", newline="\n").write(new)
        print(f"{name:16} обновлён")
        changed += 1

    print(f"\nГотово: {changed} файлов. Домен — {domain}")
    print("Не забудьте в server/.env указать SITE_URL=https://" + domain)


if __name__ == "__main__":
    main()
