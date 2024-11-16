import { generate } from 'selfsigned';

type Attributes = {
  name: string;
  value: string;
};
type AltNames = {
  type: number;
  value?: string;
  ip?: string;
};
export const createCert = (attrs: Attributes[] = [], altNames: AltNames[] = []) => {
  let attributes = [
    { name: 'commonName', value: '*' }, // 通配符域名
    { name: 'countryName', value: 'CN' }, // 国家代码
    { name: 'stateOrProvinceName', value: 'ZheJiang' }, // 州名
    { name: 'localityName', value: 'Hangzhou' }, // 城市名
    { name: 'organizationName', value: 'Envision' }, // 组织名
    { name: 'organizationalUnitName', value: 'IT' }, // 组织单位
    ...attrs,
  ];
  // attribute 根据name去重复, 后面的覆盖前面的
  attributes = attributes.filter((item, index, self) => {
    return self.findIndex((t) => t.name === item.name) === index;
  });

  const options = {
    days: 365, // 证书有效期（天）
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: '*' }, // DNS 名称
          { type: 2, value: 'localhost' }, // DNS
          { type: 7, ip: '127.0.0.1' }, // IP 地址
          ...altNames,
        ],
      },
    ],
  };
  const pems = generate(attributes, options);
  return {
    key: pems.private,
    cert: pems.cert,
  };
};
