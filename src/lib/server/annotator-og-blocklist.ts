export const ogBlockList: { [key: string]: RegExp[] } = {
	ogUrl: [new RegExp('https://www.instagram.com/accounts/login/')],
	ogTitle: [new RegExp('^x.com$')]
};

export const isResultBlocked = (result: any): boolean => {
	if (!result) {
		return false;
	}
	for (const param of Object.keys(ogBlockList)) {
		if (!result[param]) {
			continue;
		}

		const invalidValues = ogBlockList[param];
		const val = result[param] as string;
		for (const invalidValue of invalidValues) {
			//
			if (val.match(invalidValue)) {
				return true;
			}
		}
	}
	return false;
};
