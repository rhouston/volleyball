export type RouteContext = {
  params: Promise<Record<string, string>> | Record<string, string>;
};

export async function getRouteParams(context: RouteContext): Promise<Record<string, string>> {
  const { params } = context;

  if (typeof (params as Promise<Record<string, string>>).then === 'function') {
    return await (params as Promise<Record<string, string>>);
  }

  return params as Record<string, string>;
}

export async function getRouteParam(context: RouteContext, key: string): Promise<string> {
  const params = await getRouteParams(context);
  const value = params[key];

  if (!value) {
    throw new Error(`Missing route param: ${key}`);
  }

  return value;
}
