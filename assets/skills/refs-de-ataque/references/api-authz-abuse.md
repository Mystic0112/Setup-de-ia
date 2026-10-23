# Abuso de autorização em API — BOLA/IDOR, mass assignment (defesa)

Origem: `api-recon`, `api-security` (ARTEX). É o **coração** dos ataques de replay de sessão: a
automação captura uma sessão real e reusa trocando o objeto ou o campo.

## Como o ataque automatizado chega lá (TTP)
1. **BOLA / IDOR** — captura `GET /api/pedido/1001` autenticado; a automação troca o ID (`1002`, `1003`...) ou UUID enumerável e vê se o backend devolve dado de **outro** usuário. Autenticação passa (sessão é real); falta **autorização por objeto**.
2. **Broken function-level authz** — chama rota de admin (`DELETE /api/user/x`) com sessão de usuário comum; backend confia no front que "escondeu" o botão.
3. **Mass assignment** — manda campo extra no body (`"role":"admin"`, `"is_verified":true`) que o model aceita em massa.
4. **Injeção de parâmetro** — automação fuzzing um campo por vez no mesmo endpoint.

## Detecção (assinatura no log)
- **ID sequencial/enumerável** percorrido no mesmo endpoint por uma identidade = sweep de BOLA.
- Mesma sessão acessando volume anômalo de **objetos de donos diferentes**.
- Chamada a rota privilegiada por identidade sem o papel → logar **todo 403 de authz** com user+rota.
- Body com campo que o endpoint não documenta (`role`, `admin`, `price`, `status`) = tentativa de mass assignment.

## Hardening (concreto, Laravel)
- **Autorização por objeto, server-side, sempre:** `Policy` + `$this->authorize('view', $pedido)` / `Gate` em **cada** recurso. Nunca confiar que "só o dono vê o link".
- **Scope por tenant/dono na query:** `Pedido::where('user_id', auth()->id())->findOrFail($id)` — o próprio SELECT exclui objeto alheio. Melhor que checar depois.
- **Mass assignment:** `$fillable` explícito (nunca `$guarded = []`); validar via `FormRequest` com whitelist de campos; `$request->only([...])`.
- **ID não enumerável:** UUID/ULID em recurso exposto, mas **sem** abrir mão da checagem de authz (UUID só atrasa, não autoriza).
- **Rate limit por identidade** (`throttle:`), não só por IP (IP rotaciona).
- **Function-level:** middleware de papel na rota (`->middleware('can:admin')`), não no front.

Playbook strix: `vulnerabilities/idor`, `broken_function_level_authorization`, `mass_assignment`.
