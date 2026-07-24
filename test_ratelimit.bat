@echo off
for /L %%i in (1,1,7) do (
  curl -s -o NUL -w "Tentative %%i -> HTTP %%{http_code}\n" ^
    -X POST http://localhost:3333/sign_in ^
    -H "Content-Type: application/json" ^
    -d "{\"email\":\"admin@admin.admin\",\"password\":\"mauvais_mot_de_passe\"}"
)
pause
