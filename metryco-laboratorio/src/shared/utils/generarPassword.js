const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnpqrstuvwxyz";
const NUMEROS = "23456789";
const SIMBOLOS = "!@#$%&*-_";
const TODOS = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS;

function caracterAleatorio(set) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return set[arr[0] % set.length];
}

export function generarPasswordSegura(longitud = 12) {
  const obligatorios = [
    caracterAleatorio(MAYUSCULAS),
    caracterAleatorio(MINUSCULAS),
    caracterAleatorio(NUMEROS),
    caracterAleatorio(SIMBOLOS),
  ];
  const resto = Array.from({ length: longitud - obligatorios.length }, () =>
    caracterAleatorio(TODOS)
  );

  const caracteres = [...obligatorios, ...resto];
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join("");
}
