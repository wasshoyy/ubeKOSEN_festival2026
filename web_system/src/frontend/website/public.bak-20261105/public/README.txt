LAB. Research Cafe — Website starter

Files:
- index.html : all five page views (Home, Members, Soup, News, Access)
- styles.css : responsive dark / fluorescent cyan design
- script.js : page navigation, intro animation, language switcher

How to preview:
1. Extract the ZIP.
2. Open index.html in a modern browser.

Before publishing:
- Replace the sample member names and profiles.
- Replace placeholder address, station, business hours and map link.
- Replace https://www.instagram.com/ with the cafe's real Instagram profile.
- Update sample news, menu, prices and allergen information.
- For a real Google Maps destination, use the cafe's actual map share link.
- The language selector includes Japanese, English, Chinese, Korean, German, Malay and French. Some non-Japanese translations are starter copy and should be reviewed by a fluent speaker before public launch.

This is a front-end prototype; it does not include a CMS, reservation system, or server.


【オープニングアニメーションの編集】
・最初にキャラクター画像が1人ずつ登場し、3人がそろった後に「SOUP LAB.」が表示され、トップページへ切り替わります。
・画像は lab_cafe_website/images/ にあります。character-1.svg、character-2.svg、character-3.svg を自分の写真に差し替えてください。簡単なのは、写真を JPG にして、index.html の画像ファイル名（src="images/character-1.svg" など）を写真のファイル名に変更する方法です。
・団体名は lab_cafe_website/index.html 内の intro-group-name の「SOUP LAB」を変更します。
・表示時間は lab_cafe_website/script.js の setTimeout(..., 5200) の 5200（ミリ秒）で調整できます。
・登場タイミングは styles.css の .character-one / .character-two / .character-three と .intro-group-name の animation-delay で調整できます。
