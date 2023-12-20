package com.coratch.pdf.textreplacer.exceptions;

import com.coratch.pdf.textreplacer.TextReplacerApplicationProperties;

/**
 * This exception should be thrown if the text which should be replaced wasn't found
 */
public class TextToReplaceNotFoundException extends GeneralException {

	private static final long serialVersionUID = 1L;

	private TextReplacerApplicationProperties properties;

	public TextToReplaceNotFoundException(TextReplacerApplicationProperties properties) {
		this.setProperties(properties);
	}

	public TextReplacerApplicationProperties getProperties() {
		return properties;
	}

	public void setProperties(TextReplacerApplicationProperties properties) {
		this.properties = properties;
	}

}
