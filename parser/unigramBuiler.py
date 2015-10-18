from nltk.util import ngrams
import nltk
from os import listdir
import re

NGram = list()

def everygrams(tokens):
    retlist = list()
    for i in range(2, 5):
        generated_ngram = list(ngrams(tokens, i))
        print generated_ngram
        retlist.append(generated_ngram)
    return retlist

def buildNGram():
    files = [open('dataset/' + filename).read()
        for filename in listdir('dataset/')]

    sentences = list()
    for lines in [file.split('\n') for file in files]:
        for line in lines:
            lineTokens = line.split('\t')
            if len(lineTokens) > 1:
                sentences.append(lineTokens[1])

    for sentence in sentences:
        tokens = nltk.word_tokenize(sentence)
        pattern = re.compile("^[(0-9)\W]+|com|http$")
        validWords = [token for token in tokens if not pattern.match(token)]
        NGram.append(everygrams(validWords))

def getNGram():
    return NGram
