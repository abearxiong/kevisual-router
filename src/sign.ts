import { generate } from 'selfsigned';

export type Attributes = {
  name: string;
  value: string;
};
export type AltNames = {
  type: number;
  value?: string;
  ip?: string;
};
export const createCert = (attrs: Attributes[] = [], altNames: AltNames[] = []) => {
  let attributes = [
    { name: 'countryName', value: 'CN' }, // 国家代码
    { name: 'stateOrProvinceName', value: 'ZheJiang' }, // 州名
    { name: 'localityName', value: 'HangZhou' }, // 城市名
    { name: 'organizationName', value: 'kevisual' }, // 组织名
    { name: 'organizationalUnitName', value: 'kevisual' }, // 组织单位
    ...attrs,
  ];
  // attribute 根据name去重复, 后面的覆盖前面的
  attributes = Object.values(
    attributes.reduce(
      (acc, attr) => ({
        ...acc,
        [attr.name]: attr,
      }),
      {} as Record<string, Attributes>,
    ),
  );

  const options = {
    days: 365, // 证书有效期（天）
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: '*' }, // DNS 名称
          { type: 2, value: 'localhost' }, // DNS
          {
            type: 2,
            value: '[::1]',
          },
          {
            type: 7,
            ip: 'fe80::1',
          },
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
