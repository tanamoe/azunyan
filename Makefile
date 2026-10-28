generate.fxtwitterv2:
	pnpx openapi-typescript https://api.fxtwitter.com/2/openapi.json -o ./src/lib/fxtwitter/v2.d.ts
	biome format --write ./src/lib/fxtwitter/v2.d.ts
