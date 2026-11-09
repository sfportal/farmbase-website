# Dựng site/index.html và site/quan-tri/index.html từ bản nguồn trong src/.
# Chạy: python3 tools/build.py   (từ thư mục gốc repo)
# Ảnh, video, data, vendor... sửa trực tiếp trong site/ (không qua bước dựng).
import re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
head = '<!doctype html>\n<html lang="vi">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
s = open(R+'/src/farmbase-trangchu.html', encoding='utf-8').read()
s = s.replace('https://claude.ai/artifact/VXtKUFJwQ7qem4jKSNi8ev" target="_blank" rel="noopener"', 'quan-tri/"').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
s = s.replace('</title>', '</title>\n<meta name="description" content="FarmBase giúp HTX, doanh nghiệp và địa phương quản lý vùng trồng, nhật ký canh tác và truy xuất nguồn gốc sầu riêng, cà phê tại Đắk Lắk. Giải pháp do BVI và Salefronts đồng phát triển.">\n<link rel="icon" href="img/logos/bvi.png">', 1)
s = re.sub(r'<div class="draft">.*?</div>\n', '', s, count=1)  # bỏ dải "Bản phác để duyệt"
open(R+'/site/index.html', 'w', encoding='utf-8').write(head+s)
a = open(R+'/src/quan-tri.html', encoding='utf-8').read()
a = a.replace('https://claude.ai/artifact/XjHaxgWALPAvinLV65y5Ro" target="_blank" rel="noopener"', '../"').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
a = re.sub(r'(["\'`(])img/', r'\1../img/', a)  # trang quản lý nằm trong quan-tri/, nên ảnh dùng ../img/ (trong nguồn viết IP='im'+'g/' để tránh bị đổi)
open(R+'/site/quan-tri/index.html', 'w', encoding='utf-8').write(head+'<meta name="robots" content="noindex,nofollow">\n'+a)
print('built site/index.html, site/quan-tri/index.html')
