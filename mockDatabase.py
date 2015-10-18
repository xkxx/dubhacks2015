mockDb = dict()
mockDb['thank you'] = ['in advance', 'for your help', 'very much']
mockDb['\n\n'] = ['Sincerely,', 'Best,', 'Thanks,', 'Thank you,', 'Yours,']
mockDb['take'] = ['/blank/ into account', 'care']
mockDb['/empty/'] = ['Dear /blank/,', 'Hi', 'Hello']
mockDb['Dear'] = ['Miss /blank/,', 'Professor /blank/,']

def getMockData(input)
	return mockDb.get(input, list())
