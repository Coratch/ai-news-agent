package com.coratch.pdf.textreplacer.exceptions;

/**
 * This exception should be thrown if the 
 *
 */
public class MissingPDFException extends GeneralException {

	private static final long serialVersionUID = 1L;
	
	private String filePath;

	public MissingPDFException(String filePath) {
		this.filePath = filePath;
	}

	public String getFlePath() {
		return filePath;
	}

	public void setFilePath(String path) {
		this.filePath = path;
	}
	
}
