# prospectos-leadmaster

Proyecto base para gestión de prospectos de Leadmaster.

## Estructura

- `src/`: código fuente

## Primeros pasos

1. Definir stack (Node.js, Python, etc.)
2. Inicializar dependencias
3. Implementar módulos de negocio

## Conexión SSH del proyecto

Este proyecto se conecta al servidor por SSH usando:

```bash
ssh root@185.187.170.196
```

Si usas clave privada específica:

```bash
ssh -i ~/.ssh/tu_clave root@185.187.170.196
```

### Alias recomendado en `~/.ssh/config`

Agregar este bloque para conectarte más rápido con `ssh leadmaster-prod`:

```sshconfig
Host leadmaster-prod
	HostName 185.187.170.196
	User root
	IdentityFile ~/.ssh/tu_clave
```

### Scripts incluidos

- Conexión SSH:

```bash
./scripts/ssh-connect.sh
```

- Despliegue básico (sin borrar archivos remotos):

```bash
./scripts/deploy.sh
```

Si tu llave SSH no es la predeterminada, exporta antes:

```bash
export SSH_KEY=~/.ssh/tu_clave
```

Opcional para cambiar ruta remota:

```bash
export REMOTE_PATH=/root/prospectos-leadmaster
```

Por defecto, los scripts usan esta clave:

```bash
~/.ssh/leadmaster_prod
```

Puedes sobreescribirla con `SSH_KEY`.

### Seguridad de credenciales

- No se almacena contraseña del servidor en el proyecto.
- Los scripts fuerzan autenticación por clave pública (sin password).
- Si tu clave tiene passphrase, usa `ssh-agent`.
- Si no hay clave disponible, los scripts fallan con un mensaje claro y cómo corregirlo.

## Auto conexión al abrir en VS Code

Al abrir este proyecto en VS Code, se ejecuta automáticamente la tarea `SSH: conectar servidor` y abre una terminal conectando por SSH.

### Configuración inicial obligatoria (una sola vez)

Para que la auto conexión funcione, la clave pública local debe estar autorizada en el servidor:

```bash
./scripts/install-ssh-key.sh
```

Después de eso, vuelve a abrir la carpeta en VS Code y la conexión será automática.

Si no se conecta al abrir:

1. Ejecuta manualmente la tarea `SSH: conectar servidor` una vez.
2. En VS Code, permite tareas automáticas para esta carpeta (`Tasks: Manage Automatic Tasks in Folder` → `Allow Automatic Tasks in Folder`).

Archivos de configuración:

- `.vscode/tasks.json`
- `.vscode/settings.json`

Si quieres desactivarlo, cambia en `.vscode/settings.json`:

```json
{
	"task.allowAutomaticTasks": "off"
}
```
