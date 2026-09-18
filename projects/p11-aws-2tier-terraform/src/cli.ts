import { parseArgs } from "node:util";
import { defaultModel, validateModel, type TwoTierModel } from "./model.ts";
import { renderTerraform } from "./hcl.ts";

function modelFromFlags(
  region: string | undefined,
  az: string | undefined,
  vpcCidr: string | undefined,
  webCidr: string | undefined,
  dbCidr: string | undefined,
  webCountRaw: string | undefined,
  dbEngine: string | undefined,
  dbPortRaw: string | undefined,
): TwoTierModel {
  const base = defaultModel();
  return {
    ...base,
    region: region ?? base.region,
    az: az ?? base.az,
    vpcCidr: vpcCidr ?? base.vpcCidr,
    webCidr: webCidr ?? base.webCidr,
    dbCidr: dbCidr ?? base.dbCidr,
    webCount: webCountRaw === undefined ? base.webCount : Number(webCountRaw),
    dbEngine: dbEngine ?? base.dbEngine,
    dbPort: dbPortRaw === undefined ? base.dbPort : Number(dbPortRaw),
  };
}

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    region: { type: "string", short: "r" },
    az: { type: "string", short: "z" },
    "vpc-cidr": { type: "string" },
    "web-cidr": { type: "string" },
    "db-cidr": { type: "string" },
    "web-count": { type: "string" },
    "db-engine": { type: "string" },
    "db-port": { type: "string" },
  },
});

const model = modelFromFlags(
  values.region,
  values.az,
  values["vpc-cidr"],
  values["web-cidr"],
  values["db-cidr"],
  values["web-count"],
  values["db-engine"],
  values["db-port"],
);

const problems = validateModel(model);

if (values.check || problems.length > 0) {
  if (problems.length === 0) {
    console.log(`check: PASS (${model.region}, web ${model.webCidr}, db ${model.dbCidr})`);
    process.exitCode = 0;
  } else {
    for (const problem of problems) {
      console.error(`check: ${problem}`);
    }
    process.exitCode = 1;
  }
} else {
  process.stdout.write(renderTerraform(model));
}